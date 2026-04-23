const SOP_TASKS = {
  fire:     ['Call emergency services (911/999)', 'Activate nearest fire alarm pull station', 'Announce evacuation via PA system', 'Maneuver guests to assembly point A', 'Direct fire service to FDC entrance'],
  medical:  ['Dispatch first-aid certified staff', 'Request paramedics via secondary line', 'Retrieve AED/BVM from security office', 'Clear path for ambulance access', 'Assign liaison for patient next-of-kin'],
  security: ['Seal all entry/exit points', 'Deploy security response team', 'Secure witnesses in lounge area', 'Preserve digital CCTV evidence', 'Contact law enforcement supervisor'],
  flood:    ['Isolate primary water valves', 'Protect electrical assets in basement', 'Relocate guests from ground floor', 'Deploy emergency drainage pumps', 'Notify maintenance engineering team'],
  evacuation:['Initiate full building sweep', 'Verify stairwell clearance', 'Check accessibility needs of guests', 'Confirm assembly point headcount', 'Await official "All Clear" from authorities'],
  other:    ['Establish command post', 'Verify scene safety', 'Notify property manager', 'Document incident in logbook', 'Conduct after-action review'],
};

module.exports = { SOP_TASKS };
