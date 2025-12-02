export interface Tool {
  readonly name: string;
  onPointer(x: number, y: number): void;
  onPointerDown?(x: number, y: number): void;
  onPointerUp?(): void;
  update?(dt: number): void; // для будущих инерционных инструментов
}
