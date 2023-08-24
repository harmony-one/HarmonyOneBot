export const waitingExecute = (fn: () => Promise<any>, ms: number) => new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => { 
      console.error('SD images Error: waitingExecute time is up');
      reject('Error: waitingExecute time is up');
    }, ms);
    
    fn().then(resolve).catch(reject).finally(() => clearTimeout(timeoutId))
  });