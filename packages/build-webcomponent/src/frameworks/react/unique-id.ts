let sequence = 0;

// 计数器不能放进 `<script setup>`：那里面的顶层代码会在每个实例的 setup() 里执行
export function createUniqueId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}
