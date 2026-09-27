/** Eyebrow du tableau de bord propriétaire (lot D1) : trait 20 px + 11,5 px capitales, secondary. */
const DashEyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-[8px]">
    <span aria-hidden="true" className="inline-block bg-secondary" style={{ width: "20px", height: "2px" }} />
    <p className="text-secondary uppercase" style={{ fontSize: "11.5px", fontWeight: 700, letterSpacing: "0.16em" }}>
      {children}
    </p>
  </div>
);

export default DashEyebrow;
