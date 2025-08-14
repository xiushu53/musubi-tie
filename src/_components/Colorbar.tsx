import { convertDistanceUnit } from "@/utils/convertDistansUnit";

interface Props {
  maxDistance: number;
}

const Colorbar = ({ maxDistance }: Props) => {
  const gradient = "linear-gradient(to right, blue, yellow, red)";
  return (
    <div className="leaflet-bottom leaflet-right mb-4">
      <div className="leaflet-control leaflet-bar bg-opacity-80 rounded-md bg-white p-2 shadow-lg">
        <div
          style={{ background: gradient, height: "20px", width: "200px" }}
        ></div>
        <div className="flex justify-between text-xs text-gray-700">
          <span>0m</span>
          <span>{convertDistanceUnit(maxDistance / 2)}</span>
          <span>&ge;{convertDistanceUnit(maxDistance)}</span>
        </div>
        <p className="mt-1 text-center text-xs font-semibold">
          最近傍施設までの距離
        </p>
      </div>
    </div>
  );
};

export default Colorbar;
