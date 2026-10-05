// A player still in the draw: position and number only. The name stays hidden
// until the player is revealed. Clicking the card (or its button) reveals them.
export default function PlayerTile({ player, onPick }) {
  return (
    <div className="tile" onClick={() => onPick(player)}>
      <div className="tile__photo" />
      <span className="tile__pos">{player.position}</span>
      <span className="tile__number">
        <small>#</small>
        {player.number}
      </span>
      <button className="tile__status" type="button" aria-label={`Reveal player number ${player.number}`}>
        Reveal
      </button>
    </div>
  );
}
