export const isJsonString = (val: string) => {
  try {
    JSON.parse(val);
  } catch (err) {
    return false;
  }
  return true;
};
