/* Logger mínimo; podés cambiar por pino/winston si querés */
export const log = {
    info: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
  };  