import { api } from "./axios";

export const getHealth = () => {
  return api.get('/actuator/health');
};
