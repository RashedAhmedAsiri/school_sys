declare module "mammoth/mammoth.browser" { export function extractRawText(o: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>; }
