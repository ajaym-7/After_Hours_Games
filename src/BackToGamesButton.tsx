type BackToGamesButtonProps = {
  onClick: () => void;
};

export default function BackToGamesButton({ onClick }: BackToGamesButtonProps) {
  const label = 'All games';
  return (
    <button className="back-games-button" type="button" onClick={onClick} aria-label={`Back to ${label}`}>
      <span className="back-games-arrow" aria-hidden="true">←</span>
      <span className="back-games-text">{label}</span>
    </button>
  );
}
