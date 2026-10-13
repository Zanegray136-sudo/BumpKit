type Props = {
  processorsRequired: number;
  portsRequired: number;
};

export default function ProcessorAllocation({
  processorsRequired,
  portsRequired,
}: Props) {
  const portsPerProcessor =
    Math.ceil(
      portsRequired /
      Math.max(processorsRequired, 1)
    );

  return (
    <div className="panel">

      <h2 className="panel-title">
        Processor Allocation
      </h2>

      <div className="space-y-3">

        {Array.from({
          length: processorsRequired,
        }).map((_, index) => {

          const startPort =
            index *
              portsPerProcessor +
            1;

          const endPort =
            Math.min(
              (index + 1) *
                portsPerProcessor,
              portsRequired
            );

          return (
            <div
              key={index}
              className="bg-zinc-800 rounded-md p-4"
            >
              <div className="font-semibold text-green-400">
                Processor {index + 1}
              </div>

              <div className="text-zinc-300">
                Ports P
                {String(
                  startPort
                ).padStart(
                  2,
                  "0"
                )}
                {" - "}
                P
                {String(
                  endPort
                ).padStart(
                  2,
                  "0"
                )}
              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
}