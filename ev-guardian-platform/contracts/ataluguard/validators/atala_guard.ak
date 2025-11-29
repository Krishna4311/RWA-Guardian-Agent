use aiken/collection/list
use aiken/crypto.{Blake2b_224, Hash, VerificationKey}
use cardano/transaction.{OutputReference, Transaction, placeholder}

type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

pub type AtalaGuardDatum {
  admin: VerificationKeyHash,
  guardian_did: VerificationKeyHash,
  status: ByteArray,
}

pub type StatusUpdate {
  new_status: ByteArray,
  decision_log_ref: ByteArray,
}

validator atala_guard {
  spend(
    datum_opt: Option<AtalaGuardDatum>,
    redeemer: StatusUpdate,
    _input: OutputReference,
    tx: Transaction,
  ) {
    expect Some(datum) = datum_opt

    // RULE 1: Guardian DID must sign
    let guardian_signed =
      list.any(tx.extra_signatories, fn(sig) { sig == datum.guardian_did })
    
    // RULE 2: Masumi Decision Log must exist
    let valid_log = redeemer.decision_log_ref != ""

    guardian_signed? && valid_log?
  }
}

test guardian_update_valid() {
  let did: VerificationKeyHash =
    #"00112233445566778899aabbccddeeff00112233445566778899aabb"

  let datum =
    AtalaGuardDatum {
      admin: did,
      guardian_did: did,
      status: "OK",
    }

  let redeemer =
    StatusUpdate { new_status: "ALERT!", decision_log_ref: "abcd" }

  let tx =
    Transaction { ..placeholder, extra_signatories: [did] }

  atala_guard.spend(
    Some(datum),
    redeemer,
    OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    },
    tx,
  )
}
