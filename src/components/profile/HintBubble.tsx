const HintBubble = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm italic mt-1.5" style={{ color: "hsl(37, 7%, 60%)" }}>
    {children}
  </p>
);

export default HintBubble;
