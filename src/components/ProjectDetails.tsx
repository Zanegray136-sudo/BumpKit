type Props = {
  projectName: string;
  setProjectName: (value: string) => void;

  client: string;
  setClient: (value: string) => void;

  venue: string;
  setVenue: (value: string) => void;

  engineer: string;
  setEngineer: (value: string) => void;

  revision: string;
  setRevision: (value: string) => void;

  notes: string;
  setNotes: (value: string) => void;
};

export default function ProjectDetails({
  projectName,
  setProjectName,
  client,
  setClient,
  venue,
  setVenue,
  engineer,
  setEngineer,
  revision,
  setRevision,
  notes,
  setNotes,
}: Props) {
  return (
    <div className="panel">
      <h2 className="panel-title">Project Details</h2>

      <div className="grid gap-4">
        <input
          className="input"
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />

        <input
          className="input"
          placeholder="Client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
        />

        <input
          className="input"
          placeholder="Venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            className="input"
            placeholder="Engineer"
            value={engineer}
            onChange={(e) => setEngineer(e.target.value)}
          />

          <input
            className="input"
            placeholder="Revision"
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
          />
        </div>

        <textarea
          className="input min-h-24 resize-y"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}
