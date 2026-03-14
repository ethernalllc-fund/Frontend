import DateTimeJson            from './DateTime.json'            assert { type: 'json' };
import MockDeFiProtocolJson    from './MockDeFiProtocol.json'    assert { type: 'json' };
import PersonalFundJson        from './PersonalFund.json'        assert { type: 'json' };
import PersonalFundFactoryJson from './PersonalFundFactory.json' assert { type: 'json' };
import ProtocolRegistryJson    from './ProtocolRegistry.json'    assert { type: 'json' };
import TreasuryJson            from './Treasury.json'            assert { type: 'json' };
import UserPreferencesJson     from './UserPreferences.json'     assert { type: 'json' };

export const DateTimeABI            = [...DateTimeJson.abi]            as const;
export const MockDeFiProtocolABI    = [...MockDeFiProtocolJson.abi]    as const;
export const PersonalFundABI        = [...PersonalFundJson.abi]        as const;
export const PersonalFundFactoryABI = [...PersonalFundFactoryJson.abi] as const;
export const ProtocolRegistryABI    = [...ProtocolRegistryJson.abi]    as const;
export const TreasuryABI            = [...TreasuryJson.abi]            as const;
export const UserPreferencesABI     = [...UserPreferencesJson.abi]     as const;