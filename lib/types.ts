export type HourlyPoint = {
  ts: number;
  temp: number;
  condition: string;
  icon: string;
};

export type WeatherPayload = {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temp: number;
    condition: string;
    description: string;
    icon: string;
    humidity: number;
    wind: number;
    pressure: number;
    aqi?: number;
  };
  aqi?: number;
  hourly: HourlyPoint[];
};

export type ApiError = {
  error: string;
};
