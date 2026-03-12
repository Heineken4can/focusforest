import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { Logger, LoggerOptions } from 'pino';
import { RequestContextService } from './request-context.service';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor(
    configService: ConfigService,
    private readonly requestContextService: RequestContextService,
  ) {
    const level = configService.get<string>('observability.logLevel') ?? 'info';

    const options: LoggerOptions = {
      level,
      base: undefined,
      messageKey: 'message',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    };

    this.logger = pino(options);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const [stackOrMeta, maybeMeta] = optionalParams;
    const stack =
      typeof stackOrMeta === 'string' && stackOrMeta.length > 0
        ? stackOrMeta
        : undefined;
    const meta =
      typeof stackOrMeta === 'object' && stackOrMeta !== null
        ? stackOrMeta
        : maybeMeta;

    this.logger.error(
      {
        ...this.baseBindings(),
        stack,
        meta,
      },
      this.stringify(message),
    );
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('trace', message, optionalParams);
  }

  private write(
    level: 'info' | 'warn' | 'debug' | 'trace',
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const meta =
      optionalParams.length > 0
        ? {
            details: optionalParams,
          }
        : undefined;

    this.logger[level](
      {
        ...this.baseBindings(),
        meta,
      },
      this.stringify(message),
    );
  }

  private baseBindings(): Record<string, unknown> {
    return {
      requestId: this.requestContextService.getRequestId(),
    };
  }

  private stringify(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
