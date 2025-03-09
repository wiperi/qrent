import CheckListWithoutSubTask from "@/src/components/CheckListWithoutSubTask";
import DocumentPreview from "@/src/components/DocumentPreview";
import LetterForm from "@/src/components/LetterForm";

const rentalChecklist = [
  "Passport",
  "COE",
  "Visa",
  "Financial Statement",
  "Cover Letter",
  "Parent Letter",
  "Recommendation Letter",
];

export default function Page() {
  return (
    <div className="min-h-auto font-serif">
      <div className="flex flex-col lg:flex-row">
        {/* CheckList */}
        <section className="flex-[2] bg-gray-50 rounded-lg p-5 shadow-md h-auto overflow-y-auto">
          <CheckListWithoutSubTask
            title="Rental Process Checklist"
            items={rentalChecklist}
          />
        </section>

        {/* coverletter / parent letter form */}
        <section className="flex-[5] col-span-2 bg-white shadow-lg rounded-lg p-6">
          <LetterForm />
        </section>

        {/* Document Preview */}
        <section className="flex-[3] col-span-2 bg-white shadow-lg rounded-lg p-6">
          <DocumentPreview />
        </section>
      </div>
    </div>
  );
}
