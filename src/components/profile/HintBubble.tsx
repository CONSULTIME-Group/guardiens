const HintBubble = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm italic mt-1.5 text-muted-foreground">
    {children}
  </p>
);

export default HintBubble;
