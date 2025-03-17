const PriceDropdown = ({ label, name, filter, setFilter }) => {
  return (
    <div>
      <div className="text-sm text-gray-600">{label}</div>
      <select
        className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
        value={filter[name]}
        onChange={(e) => setFilter({ ...filter, [name]: e.target.value })}
      >
        <option>Any</option>
        {[...Array(39)].map((_, i) => (
          <option key={i} value={100 + i * 50}>
            ${100 + i * 50}
          </option>
        ))}
      </select>
    </div>
  );
};
export default PriceDropdown;
