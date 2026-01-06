import { EventEmitter, Output, Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[log]',
  standalone: true,
})
export class LogDirective<T = any> {
  @Input() logParams: T = 'log' as T;
  @Output() log: EventEmitter<T> = new EventEmitter<T>();
  @HostListener('click') onClick() {
    this.log.emit(this.logParams);
  }
}
