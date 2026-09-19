import { Routes } from '@angular/router';
import { Chat } from './chat/chat';
import { Preview } from './preview/preview';

export const routes: Routes = [
  { path: '', component: Chat },
  { path: 'preview', component: Preview },
];
