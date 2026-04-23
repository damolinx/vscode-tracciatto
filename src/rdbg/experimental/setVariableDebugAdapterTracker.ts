import * as vscode from 'vscode';
import type { DebugProtocol } from 'vscode-debugprotocol';
import { ExtensionContext } from '../../extensionContext';
import { DebugAdapterTracker } from '../debugAdapterTracker';

/**
 * Experimental `setVariable` fake-support. This is expected to have issues but
 * it is created to test how far it can go. `setVariable` should be implemented
 * by rdbg.
 */
export class SetVariableDebugAdapterTracker extends DebugAdapterTracker {
  private readonly interceptedMessageSeqs: Set<number>;

  constructor(context: ExtensionContext, session: vscode.DebugSession) {
    super(context, session);
    this.interceptedMessageSeqs = new Set<number>();
  }

  override async onDidSendMessage(message: DebugProtocol.ProtocolMessage): Promise<void> {
    if (!this.isResponseMessage(message)) {
      return super.onDidSendMessage(message);
    }

    if (message.command === 'initialize') {
      message.body.supportsSetVariable = true;
      return super.onDidSendMessage(message);
    }

    if (!this.interceptedMessageSeqs.delete(message.request_seq)) {
      return super.onDidSendMessage(message);
    }

    const evalResponse = message as DebugProtocol.EvaluateResponse;
    const before = JSON.stringify(evalResponse);
    const { result, type, variablesReference } = evalResponse.body;

    const setVariableResponse = message as DebugProtocol.SetVariableResponse;
    setVariableResponse.command = 'setVariable';
    setVariableResponse.body = {
      type,
      value: result,
      variablesReference,
    };
    const after = JSON.stringify(setVariableResponse);
    this.context.log.warn(
      `[${this.id}] dap.message(in): evaluate → setVariable. Before: ${before} After: ${after}`,
    );
  }

  override onWillReceiveMessage(message: any): void {
    if (!this.isRequestMessage(message) || message.command !== 'setVariable') {
      return super.onWillReceiveMessage(message);
    }

    const setVariableRequest = message as DebugProtocol.SetVariableRequest;
    const before = JSON.stringify(setVariableRequest);
    const {
      arguments: { name, value },
      seq,
    } = setVariableRequest;
    this.interceptedMessageSeqs.add(seq);

    const evalRequest = message as DebugProtocol.EvaluateRequest;
    evalRequest.command = 'evaluate';
    evalRequest.arguments = { expression: `${name} = ${value}`, context: 'repl', frameId: 1 };
    const after = JSON.stringify(evalRequest);
    this.context.log.warn(
      `[${this.id}] dap.message(out): setVariable → evaluate. Before: ${before} After: ${after}`,
    );
  }

  protected isRequestMessage(
    message: DebugProtocol.ProtocolMessage,
  ): message is DebugProtocol.Request {
    return message.type === 'request';
  }
}
