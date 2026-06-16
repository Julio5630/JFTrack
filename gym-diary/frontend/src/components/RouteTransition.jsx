import './RouteTransition.css';

export default function RouteTransition() {
  return (
    <div className="route-transition-overlay" aria-hidden="true">
      <div className="route-transition-bar">
        <span></span>
      </div>
    </div>
  );
}
