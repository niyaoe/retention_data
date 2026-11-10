import { useEffect, useState } from "react";
import api from "../../services/api";
import MasterDataTable from "../../components/common/MasterDataTable";
import "./MasterData.css";

const MasterData = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Date filter inputs
  const [dateField, setDateField] = useState("saleDate");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Only applied filters are sent to the backend
  const [appliedDateFilters, setAppliedDateFilters] = useState({
    dateField: "saleDate",
    fromDate: "",
    toDate: "",
  });

  const [filterOptions, setFilterOptions] = useState({
    subSegments: [],
    saleBranches: [],
    districts: [],
    cities: [],
    villages: [],
  });

  const [headerFilters, setHeaderFilters] = useState({
    subSegment: "",
    saleBranch: "",
    district: "",
    city: "",
    village: "",
  });

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await api.get(
          "/data/master-data/sales/filter-options",
        );

        setFilterOptions(response.data);
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/data/master-data/sales", {
          params: {
            page,
            limit,
            search: debouncedSearch,
            ...appliedDateFilters,
            ...headerFilters,
          },
        });

        const result = response.data;

        setData(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load master data.");
      } finally {
        setLoading(false);
      }
    };

    fetchMasterData();
  }, [page, limit, debouncedSearch, appliedDateFilters, headerFilters]);

  const handleApplyFilter = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setError("From Date cannot be after To Date.");
      return;
    }

    setError("");
    setPage(1);

    setAppliedDateFilters({
      dateField,
      fromDate,
      toDate,
    });
  };

  const handleClearFilter = () => {
    setDateField("saleDate");
    setFromDate("");
    setToDate("");
    setPage(1);

    setAppliedDateFilters({
      dateField: "saleDate",
      fromDate: "",
      toDate: "",
    });

    setError("");
  };

  const handleHeaderFilterChange = (key, value) => {
    setPage(1);

    setHeaderFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  };

  const columns = [
    {
      key: "slNo",
      label: "Sl. No.",
      render: (_, __, index) => (page - 1) * limit + index + 1,
    },
    { key: "chassisNumber", label: "Chassis Number" },
    { key: "registrationNumber", label: "Registration No." },
    { key: "saleDate", label: "Sale Date", render: formatDate },
    {
      key: "saleBranch",
      label: "Sales Branch",
      filterKey: "saleBranch",
      filterOptions: filterOptions.saleBranches,
      filterValue: headerFilters.saleBranch,
      onFilterChange: handleHeaderFilterChange,
    },
    { key: "model", label: "Model" },
    {
      key: "segment",
      label: "Sub Segment",
      filterKey: "subSegment",
      filterOptions: filterOptions.subSegments,
      filterValue: headerFilters.subSegment,
      onFilterChange: handleHeaderFilterChange,
    },
    { key: "customerName", label: "Customer Name" },
    { key: "phoneNumber", label: "Phone Number" },

    {
      key: "customerLocation",
      label: "District",
      filterKey: "district",
      filterOptions: filterOptions.districts,
      filterValue: headerFilters.district,
      onFilterChange: handleHeaderFilterChange,
      render: (value) => value?.district || "-",
    },
    {
      key: "customerLocation",
      label: "City",
      filterKey: "city",
      filterOptions: filterOptions.cities,
      filterValue: headerFilters.city,
      onFilterChange: handleHeaderFilterChange,
      render: (value) => value?.city || "-",
    },
    {
      key: "customerLocation",
      label: "PIN Code",
      render: (value) => value?.pincode || "-",
    },
    {
      key: "customerLocation",
      label: "Village",
      filterKey: "village",
      filterOptions: filterOptions.villages,
      filterValue: headerFilters.village,
      onFilterChange: handleHeaderFilterChange,
      render: (value) => value?.village || "-",
    },
    { key: "lastPaidFreeService", label: "Last Paid/Free Service" },
    {
      key: "lastPaidFreeServiceDate",
      label: "Service Date",
      render: formatDate,
    },
    { key: "dealerLocation", label: "Dealer Location" },
  ];

  return (
    <div className="ret-MasterData-page">
      <div className="master-date-filter">
        <div className="master-filter-field">
          <label>Date Type</label>
          <select
            value={dateField}
            onChange={(e) => setDateField(e.target.value)}
          >
            <option value="saleDate">Sale Date</option>
            <option value="serviceDate">Service Date</option>
          </select>
        </div>

        <div className="master-filter-field">
          <label>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="master-filter-field">
          <label>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="master-filter-apply"
          onClick={handleApplyFilter}
        >
          Apply Filter
        </button>

        <button
          type="button"
          className="master-filter-clear"
          onClick={handleClearFilter}
        >
          Clear Filter
        </button>
      </div>

      <MasterDataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        page={page}
        total={total}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(value) => {
          setLimit(value);
          setPage(1);
        }}
      />
    </div>
  );
};

export default MasterData;
