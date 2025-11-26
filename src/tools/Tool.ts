export interface Tool {
  onPointer(x: number, y: number): void;
  onPointerDown?(): void;
  onPointerUp?(): void;
  update?(dt: number): void; // для будущих инерционных инструментов
}
