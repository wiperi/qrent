export function defaultRentalModelAvailable() {
  return Boolean(process.env.QRENT_LOCAL_MODEL_URL && process.env.QRENT_LOCAL_MODEL_NAME);
}
