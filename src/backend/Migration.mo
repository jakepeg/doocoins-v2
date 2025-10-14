import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Trie "mo:base/Trie";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Text "mo:base/Text";

module Migration {

  // Types for migration
  public type MigrationError = {
    #NotAuthorized;
    #NoDataFound;
    #AlreadyLinked;
    #InvalidPrincipal;
  };

  public type MigrationStatus = {
    nfidPrincipal : ?Text;
    isLinked : Bool;
  };

  // State type for principal links
  public type PrincipalLinks = Trie.Trie<Principal, Principal>;

  // Helper functions for Trie operations with Principal
  private func keyPrincipal(p : Principal) : Trie.Key<Principal> {
    { key = p; hash = Principal.hash(p) };
  };

  // Initialize empty principal links trie
  public func initLinks() : PrincipalLinks {
    Trie.empty<Principal, Principal>();
  };

  // Link NFID principal to Internet Identity principal
  public func linkPrincipals(
    links : PrincipalLinks,
    caller : Principal,
    nfidPrincipal : Principal,
    iiPrincipal : Principal,
    hasNfidData : () -> Bool,
  ) : Result.Result<PrincipalLinks, MigrationError> {

    // Security: Only the II principal can initiate linking
    if (caller != iiPrincipal) {
      return #err(#NotAuthorized);
    };

    // Verify NFID principal has existing data (prevents fake links)
    if (not hasNfidData()) {
      return #err(#NoDataFound);
    };

    // Check if NFID principal is already linked
    switch (Trie.get(links, keyPrincipal(nfidPrincipal), Principal.equal)) {
      case (?_) { return #err(#AlreadyLinked) };
      case null {};
    };

    // Check if II principal is already linked (reverse lookup)
    let existingLink = Array.find<(Principal, Principal)>(
      Iter.toArray(Trie.iter(links)),
      func((nfid, ii)) = Principal.equal(ii, iiPrincipal),
    );

    switch (existingLink) {
      case (?_) { return #err(#AlreadyLinked) };
      case null {};
    };

    // Store the link (NFID -> II)
    let newLinks = Trie.put(links, keyPrincipal(nfidPrincipal), Principal.equal, iiPrincipal).0;
    #ok(newLinks);
  };

  // Resolve principal: if II principal is linked to NFID, return NFID (where data lives)
  public func resolvePrincipal(links : PrincipalLinks, caller : Principal) : Principal {
    // Check if this II principal is linked to an NFID principal
    let linkedNfid = Array.find<(Principal, Principal)>(
      Iter.toArray(Trie.iter(links)),
      func((nfid, ii)) = Principal.equal(ii, caller),
    );

    switch (linkedNfid) {
      case (?link) { link.0 }; // Return the NFID principal (where data lives)
      case null { caller }; // Return original principal
    };
  };

  // Get migration status for a principal
  public func getMigrationStatus(links : PrincipalLinks, caller : Principal) : MigrationStatus {
    // Check if this II principal is linked to an NFID
    let linkedNfid = Array.find<(Principal, Principal)>(
      Iter.toArray(Trie.iter(links)),
      func((nfid, ii)) = Principal.equal(ii, caller),
    );

    switch (linkedNfid) {
      case (?link) {
        { nfidPrincipal = ?Principal.toText(link.0); isLinked = true };
      };
      case null { { nfidPrincipal = null; isLinked = false } };
    };
  };

  // Convert PrincipalLinks to stable array for upgrades
  public func linksToStable(links : PrincipalLinks) : [(Principal, Principal)] {
    Iter.toArray(Trie.iter(links));
  };

  // Convert stable array back to PrincipalLinks after upgrades
  public func linksFromStable(entries : [(Principal, Principal)]) : PrincipalLinks {
    var links = Trie.empty<Principal, Principal>();
    for ((nfid, ii) in entries.vals()) {
      links := Trie.put(links, keyPrincipal(nfid), Principal.equal, ii).0;
    };
    links;
  };

};
