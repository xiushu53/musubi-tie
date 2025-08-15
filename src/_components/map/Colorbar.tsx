import { convertDistanceUnit } from "@/_utils/convertDistansUnit";

interface Props {
  maxDistance: number;
}

const Colorbar = ({ maxDistance }: Props) => {
  const gradient = "linear-gradient(to right, blue, yellow, red)";
  return (
    <div className="absolute bottom-10 right-4 z-10">
      <div className="bg-white bg-opacity-90 rounded-md p-3 shadow-lg border">
        <div
          style={{ background: gradient, height: "20px", width: "200px" }}
          className="rounded-sm"
        ></div>
        <div className="flex justify-between text-xs text-gray-700 mt-1">
          <span>0m</span>
          <span>{convertDistanceUnit(maxDistance / 2)}</span>
          <span>&ge; {convertDistanceUnit(maxDistance)}</span>
        </div>
        <p className="mt-2 text-center text-xs font-semibold text-gray-800">
          最近傍施設までの距離
        </p>
      </div>
    </div>
  );
};

export default Colorbar;
