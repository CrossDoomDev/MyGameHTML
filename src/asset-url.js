// Resolve against the module location, including its published release folder.
export const assetURL=name=>new URL('../assets/'+name,import.meta.url).href;
