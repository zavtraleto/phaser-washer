export interface Tool {
  readonly name: string;
  onPointer(x: number, y: number): void;
  onPointerDown?(): void;
  onPointerUp?(): void;
  update?(dt: number): void; // для будущих инерционных инструментов
}
