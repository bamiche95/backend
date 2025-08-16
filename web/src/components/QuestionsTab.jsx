const QuestionTab = ({
  professionSearch,
  handleProfessionInputChange,
  professionOptions,
  addProfession,
  selectedProfessions,
  setSelectedProfessions,
}) => {
  return (
    <div className="profession-tags mb-3">
      <label>Select relevant professions:</label>
      <input
        type="text"
        placeholder="Type to search professions..."
        value={professionSearch}
        onChange={handleProfessionInputChange}
      />

      {professionOptions.length > 0 && (
        <ul className="profession-dropdown">
          {professionOptions.map((prof) => (
            <li key={prof.proid} onClick={() => addProfession(prof)}>
              {prof.name}
            </li>
          ))}
        </ul>
      )}

      <div className="selected-tags">
        {selectedProfessions.map((prof, index) => (
          <span className="tag" key={prof.proid}>
            {prof.name}
            <button
              type="button"
              onClick={() =>
                setSelectedProfessions((prev) =>
                  prev.filter((_, i) => i !== index)
                )
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default QuestionTab;
