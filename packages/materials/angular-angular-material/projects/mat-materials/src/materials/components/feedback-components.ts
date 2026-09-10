import { Type } from '@angular/core';
import { MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

/** max：反馈指示器 + 菜单（Dialog / SnackBar / BottomSheet 为服务式，不纳入 schema 根组件） */
export const feedbackComponents: Record<string, Type<any>> = {
  MatProgressSpinner,
  MatProgressBar,
  MatMenu,
  MatMenuItem,
};

export const feedbackModules: Record<string, Type<any>> = {};
