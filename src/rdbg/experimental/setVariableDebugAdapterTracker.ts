import * as vscode from 'vscode';
import type { DebugProtocol } from 'vscode-debugprotocol';
import { ExtensionContext } from '../../extensionContext';
import { DebugAdapterTracker } from '../debugAdapterTracker';
import { isRequestMessage, KnownEvent, KnownResponse } from '../debugProtocolMessage';

/**
 * Experimental `setVariable` emulation. This is expected to have issues but it
 * is created to test how far it can go. `setVariable` should be implemented by
 * rdbg.
 * https://github.com/ruby/debug/blob/95997c297acd7adc20be81b52d2d1405805671d2/lib/debug/server_dap.rb#L172
 */
export class SetVariableDebugAdapterTracker extends DebugAdapterTracker {
  private readonly interceptedMessages: Map<number, { name: string }>;
  private readonly variablesReferences: Map<
    number,
    { name: string; type?: string; variablesReference: number; parentRef?: number }
  >;
  private readonly variablesRequestParents: Map<number, number>;

  constructor(context: ExtensionContext, session: vscode.DebugSession) {
    super(context, session);
    this.interceptedMessages = new Map();
    this.variablesReferences = new Map();
    this.variablesRequestParents = new Map();
  }

  protected override onDidSendEventMessage(message: KnownEvent): Promise<void> {
    switch (message.event) {
      case 'stopped':
        this.interceptedMessages.clear();
        this.variablesReferences.clear();
        this.variablesRequestParents.clear();
        break;
    }

    return super.onDidSendEventMessage(message);
  }

  protected override onDidSendResponseMessage(message: KnownResponse): Promise<void> {
    const interceptedMsg = this.interceptedMessages.get(message.request_seq);
    if (interceptedMsg) {
      this.interceptedMessages.delete(message.request_seq);
    }

    switch (message.command) {
      case 'evaluate':
        if (interceptedMsg) {
          this.rewriteAsSetVariable(message);
          if (message.success) {
            this.variablesReferences.set(message.body.variablesReference, {
              name: interceptedMsg.name,
              type: message.body.type,
              variablesReference: message.body.variablesReference,
            });
          }
        }
        break;

      case 'initialize':
        if (message.success) {
          message.body.supportsSetVariable = true;
        }
        break;

      case 'variables':
        if (message.success) {
          const parentRef = this.variablesRequestParents.get(message.request_seq);
          if (parentRef) {
            this.variablesRequestParents.delete(message.request_seq);
          }

          for (const variable of message.body.variables) {
            this.variablesReferences.set(variable.variablesReference, {
              name: variable.name,
              parentRef,
              type: variable.type,
              variablesReference: variable.variablesReference,
            });
          }
        }
        break;
    }

    return super.onDidSendResponseMessage(message);
  }

  override onWillReceiveMessage(message: DebugProtocol.ProtocolMessage): void {
    if (isRequestMessage(message)) {
      switch (message.command) {
        case 'setVariable':
          this.interceptedMessages.set(message.seq, { name: message.arguments.name });
          this.rewriteAsEvaluate(message);
          return;

        case 'variables':
          this.variablesRequestParents.set(message.seq, message.arguments.variablesReference);
          break;
      }
    }

    return super.onWillReceiveMessage(message);
  }

  private rewriteAsEvaluate(message: DebugProtocol.SetVariableRequest): void {
    const evalRequest: DebugProtocol.EvaluateRequest = message as any;
    evalRequest.command = 'evaluate';

    const expression = this.resolveAssignmentExpression(message);
    if (expression) {
      evalRequest.arguments = {
        context: 'watch',
        expression,
        format: message.arguments.format,
        frameId: this.debugSession.frameId,
      };
    } else {
      evalRequest.arguments = { expression: '' };
    }

    this.context.log.debug(`[${this.id}] dap.message(out): setVariable → evaluate`, evalRequest);
  }

  private resolveAssignmentExpression(
    message: DebugProtocol.SetVariableRequest,
  ): string | undefined {
    const { name, value } = message.arguments;
    if (rejectPart(name)) {
      return;
    }

    const parts: { name: string; type?: string }[] = [];

    let indexable: boolean | undefined = undefined;
    let ref = message.arguments.variablesReference;

    while (true) {
      const parent = this.variablesReferences.get(ref);
      if (!parent) {
        break; // done
      }
      if (rejectPart(parent.name)) {
        return; // nope
      }

      indexable ??= !!parent.type && isIndexable(parent.type);
      parts.unshift({ name: parent.name, type: parent.type });

      if (parent.parentRef === undefined || parent.parentRef === ref) {
        break;
      }
      ref = parent.parentRef;
    }

    let expression = buildRefExpression(parts);
    if (indexable) {
      expression += `[${name}] = ${value}`;
    } else {
      const assignExpr = name.startsWith('@')
        ? `instance_variable_set(:${name}, ${value})`
        : `${name} = ${value}`;
      expression = expression ? `${expression}.${assignExpr}` : assignExpr;
    }

    return expression;

    function isIndexable(type: string): boolean {
      return Boolean(type) && ['Array', 'Hash'].includes(type);
    }

    function rejectPart(name: string): boolean {
      return (
        name.startsWith('#') ||
        name.startsWith('%') ||
        /^\$[\W\d]/.test(name) ||
        ['$stdin', '$stdout', '$stderr'].includes(name)
      );
    }

    function buildRefExpression(parts: { name: string; type?: string }[]): string {
      if (parts.length === 0) {
        return '';
      }

      let expr = parts[0].name;
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        const parent = parts[i - 1];

        if (parent.type && isIndexable(parent.type)) {
          expr += `[${p.name}]`;
        } else {
          expr += `.${p.name}`;
        }
      }

      return expr;
    }
  }

  private rewriteAsSetVariable(
    message: DebugProtocol.EvaluateResponse,
  ): DebugProtocol.SetVariableResponse {
    const setVarResponse: DebugProtocol.SetVariableResponse = message as any;
    setVarResponse.command = 'setVariable';

    const { result: value, type } = message.body;
    if (message.success) {
      switch (type) {
        case 'ArgumentError':
        case 'FrozenError':
        case 'KeyError':
        case 'NameError':
        case 'NoMethodError':
        case 'RangeError':
        case 'RuntimeError':
        case 'SyntaxError':
        case 'TypeError':
        case 'ZeroDivisionError':
          // Raised vs assigned errors are indistinguishable here
          setVarResponse.success = false;
          setVarResponse.message =
            value.match(/^.+?:\s+(?:.+:\d+:\s+)?(.+?)(?:>|\n|$)/)?.[1] || value;
          break;

        default:
          setVarResponse.body = {
            indexedVariables: message.body.indexedVariables,
            namedVariables: message.body.namedVariables,
            type,
            value,
            variablesReference: message.body.variablesReference,
          };
          break;
      }
    } else {
      setVarResponse.message = value.replace('evaluate', 'set value') ?? "can't set value";
    }

    this.context.log.debug(`[${this.id}] dap.message(in): evaluate → setVariable`, setVarResponse);
    return setVarResponse;
  }
}
