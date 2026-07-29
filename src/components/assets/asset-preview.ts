import { useEffect, useState } from "react";
import { assetService, type NexusAsset } from "@/lib/assets/asset-service";

export function useAssetPreviewUrls(assets: NexusAsset[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const previewable = assets.filter((asset) =>
      asset.mime_type.startsWith("image/"),
    );

    setUrls({});
    if (!previewable.length) return () => undefined;

    void Promise.all(
      previewable.map(async (asset) => {
        try {
          return [
            asset.id,
            await assetService.createTemporaryAccess(asset, 300),
          ] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setUrls(
        Object.fromEntries(
          entries.filter(
            (entry): entry is readonly [string, string] => entry !== null,
          ),
        ),
      );
    });

    return () => {
      active = false;
    };
  }, [assets]);

  return urls;
}
