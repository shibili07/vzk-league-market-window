export default function PickButton({ disabled, allDone, empty, onClick }) {
  const label = empty ? 'No players yet' : allDone ? 'All players revealed' : 'Reveal random player';

  return (
    <div className="pick">
      <button className="pick__btn" disabled={disabled} onClick={onClick}>
        {label}
      </button>
    </div>
  );
}
