import DateTimeJson            from './DateTime.json';
import MockDeFiProtocolJson    from './MockDeFiProtocol.json';
import PersonalFundJson        from './PersonalFund.json';
import PersonalFundFactoryJson from './PersonalFundFactory.json';
import ProtocolRegistryJson    from './ProtocolRegistry.json';
import TreasuryJson            from './Treasury.json';
import UserPreferencesJson     from './UserPreferences.json';

export const DateTimeABI            = [...DateTimeJson.abi]            as const;
export const MockDeFiProtocolABI    = [...MockDeFiProtocolJson.abi]    as const;
export const PersonalFundABI        = [...PersonalFundJson.abi]        as const;
export const PersonalFundFactoryABI = [...PersonalFundFactoryJson.abi] as const;
export const ProtocolRegistryABI    = [...ProtocolRegistryJson.abi]    as const;
export const TreasuryABI            = [...TreasuryJson.abi]            as const;
export const UserPreferencesABI     = [...UserPreferencesJson.abi]     as const;

export const DATETIME_ABI              = DateTimeABI;
export const MOCK_DEFI_PROTOCOL_ABI    = MockDeFiProtocolABI;
export const PERSONAL_FUND_ABI         = PersonalFundABI;
export const PERSONAL_FUND_FACTORY_ABI = PersonalFundFactoryABI;
export const PROTOCOL_REGISTRY_ABI     = ProtocolRegistryABI;
export const TREASURY_ABI              = TreasuryABI;
export const USER_PREFERENCES_ABI      = UserPreferencesABI;