import ConfigureGroup from "../components/ConfigureGroup";
import { useParams } from "react-router-dom";

function ConfigureGroupPage() {
  const { groupId } = useParams();
  return <ConfigureGroup preselectedGroupId={groupId} />;
}

export default ConfigureGroupPage;
