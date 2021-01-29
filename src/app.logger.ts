import { Injectable, Scope, Logger } from '@nestjs/common';
import moment from 'moment';

@Injectable()
export class AppLogger extends Logger {
  private combineStrings(args: any[]) {
    const strings = args.map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      return arg.toString() as string;
    });
    const combinedString = strings.join(' ');
    return combinedString;
  }
  compatLog(...args) {
    return this.log(this.combineStrings(args));
  }
  compatWarn(...args) {
    return this.warn(this.combineStrings(args));
  }
  compatError(...args) {
    return this.error(this.combineStrings(args));
  }
  compatDebug(...args) {
    return this.debug(this.combineStrings(args));
  }
}
