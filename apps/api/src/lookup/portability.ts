export interface PortabilityResult {
  checked: boolean;
  ported: boolean | null;
  carrier: string | null;
}

export interface PortabilityProvider {
  lookup(e164: string): Promise<PortabilityResult | null>;
}

export class NullPortabilityProvider implements PortabilityProvider {
  async lookup(_e164: string): Promise<PortabilityResult | null> {
    return null;
  }
}
