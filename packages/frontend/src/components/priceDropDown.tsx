// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const Textbox = ({ label, name, filter, setFilter, ph }) => {
  return (
    <div>
      <div className="text-sm text-gray-600 ">{label}</div>
      <input
        type="number"
        className="border rounded px-2 py-1 w-full bg-white"
        value={filter[name]}
        onChange={e => setFilter({ ...filter, [name]: e.target.value })}
        placeholder={ph}
      />
    </div>
  );
};

export default Textbox;
