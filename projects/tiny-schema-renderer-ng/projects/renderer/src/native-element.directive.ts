import { Binding, Directive, ElementRef, forwardRef, Input, Self, SimpleChanges, SkipSelf, Type } from '@angular/core';
@Directive({
  selector: '[htmlElement]',
  standalone: true
})
export class HtmlElementDirective {
  @Input() htmlElement: string = '';
  @Input() projectNodes: any[][] = [[]];

  private element: Element | null = null;

  get parentElement(): HTMLElement | null {
    return this.elementRef.nativeElement.parentElement;
  }
  get nativeElement(): Element | null {
    return this.elementRef.nativeElement; // 定位元素
  }

  constructor(private elementRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['htmlElement']) {
      this.createElement();
      this.appendNodes(this.projectNodes);
      this.insertElement();
      return;
    }

    if (changes['projectNodes']) {
      this.appendNodes(this.projectNodes);
      this.insertElement();
    }
  }

  protected createElement() {
    if (this.element) {
      this.element.remove();
    }
    this.element = document.createElement(this.htmlElement);
  }

  protected insertElement() {
    if (this.element) {
      this.parentElement?.insertBefore(this.element, this.nativeElement);
    }
  }

  protected appendNodes(projectNodes: any[][] | null) {
    if (!this.element) {
      return;
    }
    Array.from(this.element.children).forEach((node) => {
      node.remove();
    });
    projectNodes?.forEach((nodes) => {
      nodes.forEach((node) => {
        this.element!.appendChild(node);
      });
    });
  }

  ngOnDestroy() {
    if (this.element) {
      this.element.remove();
    }
  }
}
