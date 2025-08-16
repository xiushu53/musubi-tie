import { useCallback, useState } from "react";

export type CardState<T extends string> = {
  [key in T]: boolean;
};

export const useCardState = <T extends string>(initialState: CardState<T>) => {
  const [cardStates, setCardStates] = useState(initialState);

  const toggleCard = useCallback((cardName: T) => {
    setCardStates((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  }, []);

  return { cardStates, toggleCard };
};
