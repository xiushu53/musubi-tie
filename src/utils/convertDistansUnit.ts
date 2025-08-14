export const convertDistanceUnit = (distance: number): string => {
  if (distance < 1000) {
    return `${distance} m`;
  } else {
    return `${Math.round(distance / 100) / 10} km`;
  }
};
