export const Notify = (options: { type: 'warning' | 'error' | 'success', title: string, message: string }) => {
  console.log('Notify', options);
}