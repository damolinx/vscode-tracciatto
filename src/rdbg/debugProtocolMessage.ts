import type { DebugProtocol } from 'vscode-debugprotocol';

type InitializedEvent = DebugProtocol.InitializedEvent & {
  event: 'initialized';
};

type OutputEvent = DebugProtocol.OutputEvent & {
  event: 'output';
};

type StoppedEvent = DebugProtocol.StoppedEvent & {
  event: 'stopped';
};

type TerminatedEvent = DebugProtocol.TerminatedEvent & {
  event: 'terminated';
};

export type KnownEvent = InitializedEvent | StoppedEvent | OutputEvent | TerminatedEvent;

type EvaluateRequest = DebugProtocol.EvaluateRequest & {
  command: 'evaluate';
};

type SetVariableRequest = DebugProtocol.SetVariableRequest & {
  command: 'setVariable';
};

type VariablesRequest = DebugProtocol.VariablesRequest & {
  command: 'variables';
};

export type KnownRequest = EvaluateRequest | SetVariableRequest | VariablesRequest;

type SafeResponse<T extends DebugProtocol.Response, C extends string> =
  | (Omit<T, 'body' | 'success'> & {
      command: C;
      success: true;
      body: NonNullable<T['body']>;
    })
  | (Omit<T, 'body' | 'success'> & {
      command: C;
      success: false;
      body?: undefined;
    });

export type ContinueResponse = SafeResponse<DebugProtocol.ContinueResponse, 'continue'>;
export type DisconnectResponse = SafeResponse<DebugProtocol.DisconnectResponse, 'disconnect'>;
export type EvaluateResponse = SafeResponse<DebugProtocol.EvaluateResponse, 'evaluate'>;
export type InitializeResponse = SafeResponse<DebugProtocol.InitializeResponse, 'initialize'>;
export type ScopesResponse = SafeResponse<DebugProtocol.ScopesResponse, 'scopes'>;
export type VariablesResponse = SafeResponse<DebugProtocol.VariablesResponse, 'variables'>;

export type KnownResponse =
  | ContinueResponse
  | DisconnectResponse
  | EvaluateResponse
  | InitializeResponse
  | ScopesResponse
  | VariablesResponse;

export function isEventMessage(message: DebugProtocol.ProtocolMessage): message is KnownEvent {
  return message.type === 'event';
}

export function isRequestMessage(message: DebugProtocol.ProtocolMessage): message is KnownRequest {
  return message.type === 'request';
}

export function isResponseMessage(
  message: DebugProtocol.ProtocolMessage,
): message is KnownResponse {
  return message.type === 'response';
}
