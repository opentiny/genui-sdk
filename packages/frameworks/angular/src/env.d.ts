declare namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string; // 明确告诉 TS，这个属性是存在的，不再只是索引
    }
  }