/** SeatLegend — explains the seat states. */

const SeatLegend = () => (
  <ul className="seat-legend" aria-label="Seat legend">
    <li>
      <span className="legend-swatch is-available" aria-hidden="true" />
      Available
    </li>
    <li>
      <span className="legend-swatch is-selected" aria-hidden="true" />
      Selected
    </li>
    <li>
      <span className="legend-swatch is-occupied" aria-hidden="true" />
      Booked for this journey
    </li>
  </ul>
);

export default SeatLegend;
