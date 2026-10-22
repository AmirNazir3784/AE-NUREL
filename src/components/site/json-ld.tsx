// Renders one JSON-LD structured-data script tag. Data comes only from the
// site's own registry/constants (see src/lib/structured-data.ts), never from
// user input.
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
