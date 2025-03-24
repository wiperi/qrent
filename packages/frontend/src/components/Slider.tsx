export default function RatingSlider({ filter, setFilter }) {
  return (
    <div className="space-y-2">
      <input
        type="range"
        min="1"
        max="20"
        step="0.5"
        value={filter.rate ?? 13}
        onChange={e => setFilter({ ...filter, rate: e.target.value })}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
        [&::-webkit-slider-thumb]:appearance-none 
        [&::-webkit-slider-thumb]:w-4 
        [&::-webkit-slider-thumb]:h-4 
        [&::-webkit-slider-thumb]:bg-blue-primary 
        [&::-webkit-slider-thumb]:rounded-full 
        [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <div className="text-gray-700 text-sm"> ≥ {filter.rate ?? 13} </div>
    </div>
  );
}
