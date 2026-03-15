export function substituteTemplateArgs(
  args: string[],
  vars: Record<string, string>
): string[] {
  return args.map((arg) =>
    arg.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "")
  );
}
