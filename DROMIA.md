# DromIA CVAT companion

This repository is a narrowly scoped CVAT fork for reviewing DromIA pose results. It is based
on upstream CVAT commit `cb55cc676f6f850da46a6c6fb6d71252d11c53db` and retains only the
paper-facing upload, calibration, pose, event, metrics, and export interface.

The interface talks to DromIA's versioned local API at `/api/v1`. During development, run it
from the sibling `dromia` checkout with `uv run dromia stack up`.

The upstream CVAT source remains under its MIT license. See `THIRD_PARTY_NOTICES.md` and the
repository `LICENSE` file. No model weights, research data, or DromIA application source are
stored here.
