{
  description = "A Nix-flake-based development environment for the Access Control Planning Tool";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            just
            nodePackages.browser-sync
            # basic linting/formatting tools available in shell if preferred, 
            # though package.json is better for version locking
            nodePackages.prettier 
          ];

          shellHook = ''
            echo "Welcome to the Access Control Planning Tool dev environment!"
            echo "Run 'just' to see available commands."
          '';
        };
      }
    );
}
